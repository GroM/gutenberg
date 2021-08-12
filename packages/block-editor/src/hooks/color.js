/**
 * External dependencies
 */
import classnames from 'classnames';
import { isObject, setWith, clone } from 'lodash';

/**
 * WordPress dependencies
 */
import { addFilter } from '@wordpress/hooks';
import { getBlockSupport } from '@wordpress/blocks';
import { __ } from '@wordpress/i18n';
import { useRef, useEffect, Platform } from '@wordpress/element';
import { createHigherOrderComponent } from '@wordpress/compose';

/**
 * Internal dependencies
 */
import {
	getColorClassName,
	getColorObjectByColorValue,
	getColorObjectByAttributeValues,
} from '../components/colors';
import {
	__experimentalGetGradientClass,
	getGradientValueBySlug,
	getGradientSlugByValue,
} from '../components/gradients';
import { cleanEmptyObject } from './utils';
import ColorPanel from './color-panel';
import useSetting from '../components/use-setting';

export const COLOR_SUPPORT_KEY = 'color';
const EMPTY_ARRAY = [];

const hasColorSupport = ( blockType ) => {
	const colorSupport = getBlockSupport( blockType, COLOR_SUPPORT_KEY );
	return (
		colorSupport &&
		( colorSupport.link === true ||
			colorSupport.gradient === true ||
			colorSupport.background !== false ||
			colorSupport.text !== false )
	);
};

const shouldSkipSerialization = ( blockType ) => {
	const colorSupport = getBlockSupport( blockType, COLOR_SUPPORT_KEY );

	return colorSupport?.__experimentalSkipSerialization;
};

const hasLinkColorSupport = ( blockType ) => {
	if ( Platform.OS !== 'web' ) {
		return false;
	}

	const colorSupport = getBlockSupport( blockType, COLOR_SUPPORT_KEY );

	return isObject( colorSupport ) && !! colorSupport.link;
};

const hasGradientSupport = ( blockType ) => {
	const colorSupport = getBlockSupport( blockType, COLOR_SUPPORT_KEY );

	return isObject( colorSupport ) && !! colorSupport.gradients;
};

const hasBackgroundColorSupport = ( blockType ) => {
	const colorSupport = getBlockSupport( blockType, COLOR_SUPPORT_KEY );

	return colorSupport && colorSupport.background !== false;
};

const hasTextColorSupport = ( blockType ) => {
	const colorSupport = getBlockSupport( blockType, COLOR_SUPPORT_KEY );

	return colorSupport && colorSupport.text !== false;
};

/**
 * Checks whether a color has been set either with a named preset color in
 * a top level block attribute or as a custom value within the style attribute
 * object.
 *
 * @param {string} name Name of the color to check.
 * @return {boolean} Whether or not a color has a value.
 */
const hasColor = ( name ) => ( props ) => {
	if ( name === 'background' ) {
		return (
			!! props.attributes.backgroundColor ||
			!! props.attributes.style?.color?.background ||
			!! props.attributes.gradient ||
			!! props.attributes.style?.color?.gradient
		);
	}

	if ( name === 'link' ) {
		return !! props.attributes.style?.elements?.link?.color?.text;
	}

	return (
		!! props.attributes[ `${ name }Color` ] ||
		!! props.attributes.style?.color?.[ name ]
	);
};

/**
 * Clears a single color property from a style object.
 *
 * @param {Array}  path  Path to color property to clear within styles object.
 * @param {Object} style Block attributes style object.
 * @return {Object} Styles with the color property omitted.
 */
const clearColorFromStyles = ( path, style ) =>
	cleanEmptyObject( immutableSet( style, path, undefined ) );

/**
 * Resets the block attributes for text color.
 *
 * @param {Object}   props               Current block props.
 * @param {Object}   props.attributes    Block attributes.
 * @param {Function} props.setAttributes Block's setAttributes prop used to apply reset.
 */
const resetTextColor = ( { attributes, setAttributes } ) => {
	setAttributes( {
		textColor: undefined,
		style: clearColorFromStyles( [ 'color', 'text' ], attributes.style ),
	} );
};

/**
 * Clears text color related properties from supplied attributes.
 *
 * @param {Object} attributes Block attributes.
 * @return {Object} Update block attributes with text color properties omitted.
 */
const resetAllTextFilter = ( attributes ) => ( {
	textColor: undefined,
	style: clearColorFromStyles( [ 'color', 'text' ], attributes.style ),
} );

/**
 * Resets the block attributes for link color.
 *
 * @param {Object}   props               Current block props.
 * @param {Object}   props.attributes    Block attributes.
 * @param {Function} props.setAttributes Block's setAttributes prop used to apply reset.
 */
const resetLinkColor = ( { attributes, setAttributes } ) => {
	const path = [ 'elements', 'link', 'color', 'text' ];
	setAttributes( { style: clearColorFromStyles( path, attributes.style ) } );
};

/**
 * Clears link color related properties from supplied attributes.
 *
 * @param {Object} attributes Block attributes.
 * @return {Object} Update block attributes with link color properties omitted.
 */
const resetAllLinkFilter = ( attributes ) => ( {
	style: clearColorFromStyles(
		[ 'elements', 'link', 'color', 'text' ],
		attributes.style
	),
} );

/**
 * Clears all background color related properties including gradients from
 * supplied block attributes.
 *
 * @param {Object} attributes Block attributes.
 * @return {Object} Block attributes with background and gradient omitted.
 */
const clearBackgroundAndGradient = ( attributes ) => ( {
	backgroundColor: undefined,
	gradient: undefined,
	style: {
		...attributes.style,
		color: {
			...attributes.style?.color,
			background: undefined,
			gradient: undefined,
		},
	},
} );

/**
 * Resets the block attributes for both background color and gradient.
 *
 * @param {Object}   props               Current block props.
 * @param {Object}   props.attributes    Block attributes.
 * @param {Function} props.setAttributes Block's setAttributes prop used to apply reset.
 */
const resetBackgroundAndGradient = ( { attributes, setAttributes } ) => {
	setAttributes( clearBackgroundAndGradient( attributes ) );
};

/**
 * Filters registered block settings, extending attributes to include
 * `backgroundColor` and `textColor` attribute.
 *
 * @param {Object} settings Original block settings.
 *
 * @return {Object} Filtered block settings.
 */
function addAttributes( settings ) {
	if ( ! hasColorSupport( settings ) ) {
		return settings;
	}

	// allow blocks to specify their own attribute definition with default values if needed.
	if ( ! settings.attributes.backgroundColor ) {
		Object.assign( settings.attributes, {
			backgroundColor: {
				type: 'string',
			},
		} );
	}
	if ( ! settings.attributes.textColor ) {
		Object.assign( settings.attributes, {
			textColor: {
				type: 'string',
			},
		} );
	}

	if ( hasGradientSupport( settings ) && ! settings.attributes.gradient ) {
		Object.assign( settings.attributes, {
			gradient: {
				type: 'string',
			},
		} );
	}

	return settings;
}

/**
 * Override props assigned to save component to inject colors classnames.
 *
 * @param {Object} props      Additional props applied to save element.
 * @param {Object} blockType  Block type.
 * @param {Object} attributes Block attributes.
 *
 * @return {Object} Filtered props applied to save element.
 */
export function addSaveProps( props, blockType, attributes ) {
	if (
		! hasColorSupport( blockType ) ||
		shouldSkipSerialization( blockType )
	) {
		return props;
	}

	const hasGradient = hasGradientSupport( blockType );

	// I'd have preferred to avoid the "style" attribute usage here
	const { backgroundColor, textColor, gradient, style } = attributes;

	const backgroundClass = getColorClassName(
		'background-color',
		backgroundColor
	);
	const gradientClass = __experimentalGetGradientClass( gradient );
	const textClass = getColorClassName( 'color', textColor );
	const newClassName = classnames(
		props.className,
		textClass,
		gradientClass,
		{
			// Don't apply the background class if there's a custom gradient
			[ backgroundClass ]:
				( ! hasGradient || ! style?.color?.gradient ) &&
				!! backgroundClass,
			'has-text-color': textColor || style?.color?.text,
			'has-background':
				backgroundColor ||
				style?.color?.background ||
				( hasGradient && ( gradient || style?.color?.gradient ) ),
			'has-link-color': style?.elements?.link?.color,
		}
	);
	props.className = newClassName ? newClassName : undefined;

	return props;
}

/**
 * Filters registered block settings to extend the block edit wrapper
 * to apply the desired styles and classnames properly.
 *
 * @param {Object} settings Original block settings.
 *
 * @return {Object} Filtered block settings.
 */
export function addEditProps( settings ) {
	if (
		! hasColorSupport( settings ) ||
		shouldSkipSerialization( settings )
	) {
		return settings;
	}
	const existingGetEditWrapperProps = settings.getEditWrapperProps;
	settings.getEditWrapperProps = ( attributes ) => {
		let props = {};
		if ( existingGetEditWrapperProps ) {
			props = existingGetEditWrapperProps( attributes );
		}
		return addSaveProps( props, settings, attributes );
	};

	return settings;
}

const getLinkColorFromAttributeValue = ( colors, value ) => {
	const attributeParsed = /var:preset\|color\|(.+)/.exec( value );
	if ( attributeParsed && attributeParsed[ 1 ] ) {
		return getColorObjectByAttributeValues( colors, attributeParsed[ 1 ] )
			.color;
	}
	return value;
};

function immutableSet( object, path, value ) {
	return setWith( object ? clone( object ) : {}, path, value, clone );
}

/**
 * Inspector control panel containing the color related configuration
 *
 * @param {Object} props
 *
 * @return {WPElement} Color edit element.
 */
export function ColorEdit( props ) {
	const { name: blockName, attributes } = props;
	const solids = useSetting( 'color.palette' ) || EMPTY_ARRAY;
	const gradients = useSetting( 'color.gradients' ) || EMPTY_ARRAY;
	const areCustomSolidsEnabled = useSetting( 'color.custom' );
	const areCustomGradientsEnabled = useSetting( 'color.customGradient' );
	const isLinkEnabled = useSetting( 'color.link' );
	const isTextEnabled = useSetting( 'color.text' );
	const isBackgroundEnabled = useSetting( 'color.background' );

	// Shouldn't be needed but right now the ColorGradientsPanel
	// can trigger both onChangeColor and onChangeBackground
	// synchronously causing our two callbacks to override changes
	// from each other.
	const localAttributes = useRef( attributes );
	useEffect( () => {
		localAttributes.current = attributes;
	}, [ attributes ] );

	if ( ! hasColorSupport( blockName ) ) {
		return null;
	}

	const hasLinkColor =
		hasLinkColorSupport( blockName ) &&
		isLinkEnabled &&
		( solids.length > 0 || areCustomSolidsEnabled );
	const hasTextColor =
		hasTextColorSupport( blockName ) &&
		isTextEnabled &&
		( solids.length > 0 || areCustomSolidsEnabled );
	const hasBackgroundColor =
		hasBackgroundColorSupport( blockName ) &&
		isBackgroundEnabled &&
		( solids.length > 0 || areCustomSolidsEnabled );
	const hasGradientColor =
		hasGradientSupport( blockName ) &&
		( gradients.length > 0 || areCustomGradientsEnabled );

	if (
		! hasLinkColor &&
		! hasTextColor &&
		! hasBackgroundColor &&
		! hasGradientColor
	) {
		return null;
	}

	const { style, textColor, backgroundColor, gradient } = attributes;
	let gradientValue;
	if ( hasGradientColor && gradient ) {
		gradientValue = getGradientValueBySlug( gradients, gradient );
	} else if ( hasGradientColor ) {
		gradientValue = style?.color?.gradient;
	}

	const onChangeColor = ( name ) => ( value ) => {
		const colorObject = getColorObjectByColorValue( solids, value );
		const attributeName = name + 'Color';
		const newStyle = {
			...localAttributes.current.style,
			color: {
				...localAttributes.current?.style?.color,
				[ name ]: colorObject?.slug ? undefined : value,
			},
		};

		const newNamedColor = colorObject?.slug ? colorObject.slug : undefined;
		const newAttributes = {
			style: cleanEmptyObject( newStyle ),
			[ attributeName ]: newNamedColor,
		};

		props.setAttributes( newAttributes );
		localAttributes.current = {
			...localAttributes.current,
			...newAttributes,
		};
	};

	const onChangeGradient = ( value ) => {
		const slug = getGradientSlugByValue( gradients, value );
		let newAttributes;
		if ( slug ) {
			const newStyle = {
				...localAttributes.current?.style,
				color: {
					...localAttributes.current?.style?.color,
					gradient: undefined,
				},
			};
			newAttributes = {
				style: cleanEmptyObject( newStyle ),
				gradient: slug,
			};
		} else {
			const newStyle = {
				...localAttributes.current?.style,
				color: {
					...localAttributes.current?.style?.color,
					gradient: value,
				},
			};
			newAttributes = {
				style: cleanEmptyObject( newStyle ),
				gradient: undefined,
			};
		}
		props.setAttributes( newAttributes );
		localAttributes.current = {
			...localAttributes.current,
			...newAttributes,
		};
	};

	const onChangeLinkColor = ( value ) => {
		const colorObject = getColorObjectByColorValue( solids, value );
		const newLinkColorValue = colorObject?.slug
			? `var:preset|color|${ colorObject.slug }`
			: value;

		const newStyle = cleanEmptyObject(
			immutableSet(
				style,
				[ 'elements', 'link', 'color', 'text' ],
				newLinkColorValue
			)
		);
		props.setAttributes( { style: newStyle } );
	};

	const defaultColorControls = getBlockSupport( props.name, [
		COLOR_SUPPORT_KEY,
		'__experimentalDefaultControls',
	] );

	return (
		<ColorPanel
			enableContrastChecking={
				// Turn on contrast checker for web only since it's not supported on mobile yet.
				Platform.OS === 'web' && ! gradient && ! style?.color?.gradient
			}
			clientId={ props.clientId }
			settings={ [
				...( hasTextColor
					? [
							{
								label: __( 'Text color' ),
								onColorChange: onChangeColor( 'text' ),
								colorValue: getColorObjectByAttributeValues(
									solids,
									textColor,
									style?.color?.text
								).color,
								isShownByDefault: defaultColorControls?.text,
								hasValue: () => hasColor( 'text' )( props ),
								onDeselect: () => resetTextColor( props ),
								resetAllFilter: resetAllTextFilter,
							},
					  ]
					: [] ),
				...( hasBackgroundColor || hasGradientColor
					? [
							{
								label: __( 'Background color' ),
								onColorChange: hasBackgroundColor
									? onChangeColor( 'background' )
									: undefined,
								colorValue: getColorObjectByAttributeValues(
									solids,
									backgroundColor,
									style?.color?.background
								).color,
								gradientValue,
								onGradientChange: hasGradientColor
									? onChangeGradient
									: undefined,
								isShownByDefault:
									defaultColorControls?.background,
								hasValue: () =>
									hasColor( 'background' )( props ),
								onDeselect: () =>
									resetBackgroundAndGradient( props ),
								resetAllFilter: clearBackgroundAndGradient,
							},
					  ]
					: [] ),
				...( hasLinkColor
					? [
							{
								label: __( 'Link Color' ),
								onColorChange: onChangeLinkColor,
								colorValue: getLinkColorFromAttributeValue(
									solids,
									style?.elements?.link?.color?.text
								),
								clearable: !! style?.elements?.link?.color
									?.text,
								isShownByDefault: defaultColorControls?.link,
								hasValue: () => hasColor( 'link' )( props ),
								onDeselect: () => resetLinkColor( props ),
								resetAllFilter: resetAllLinkFilter,
							},
					  ]
					: [] ),
			] }
		/>
	);
}

/**
 * This adds inline styles for color palette colors.
 * Ideally, this is not needed and themes should load their palettes on the editor.
 *
 * @param {Function} BlockListBlock Original component.
 *
 * @return {Function} Wrapped component.
 */
export const withColorPaletteStyles = createHigherOrderComponent(
	( BlockListBlock ) => ( props ) => {
		const { name, attributes } = props;
		const { backgroundColor, textColor } = attributes;
		const colors = useSetting( 'color.palette' ) || EMPTY_ARRAY;
		if ( ! hasColorSupport( name ) || shouldSkipSerialization( name ) ) {
			return <BlockListBlock { ...props } />;
		}

		const extraStyles = {
			color: textColor
				? getColorObjectByAttributeValues( colors, textColor )?.color
				: undefined,
			backgroundColor: backgroundColor
				? getColorObjectByAttributeValues( colors, backgroundColor )
						?.color
				: undefined,
		};

		let wrapperProps = props.wrapperProps;
		wrapperProps = {
			...props.wrapperProps,
			style: {
				...extraStyles,
				...props.wrapperProps?.style,
			},
		};

		return <BlockListBlock { ...props } wrapperProps={ wrapperProps } />;
	}
);

addFilter(
	'blocks.registerBlockType',
	'core/color/addAttribute',
	addAttributes
);

addFilter(
	'blocks.getSaveContent.extraProps',
	'core/color/addSaveProps',
	addSaveProps
);

addFilter(
	'blocks.registerBlockType',
	'core/color/addEditProps',
	addEditProps
);

addFilter(
	'editor.BlockListBlock',
	'core/color/with-color-palette-styles',
	withColorPaletteStyles
);
