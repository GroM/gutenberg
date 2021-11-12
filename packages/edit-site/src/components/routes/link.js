/**
 * WordPress dependencies
 */
import { addQueryArgs } from '@wordpress/url';

/**
 * Internal dependencies
 */
import { push, replace } from './history';

export function useLink( params = {}, shouldReplace = false ) {
	const searchParams = {
		page: 'gutenberg-edit-site',
		...params,
	};

	function onClick( event ) {
		event.preventDefault();

		if ( shouldReplace ) {
			replace( searchParams );
		} else {
			push( searchParams );
		}
	}

	return {
		href: addQueryArgs( '', searchParams ),
		onClick,
	};
}

export default function Link( {
	params = {},
	replace: shouldReplace = false,
	children,
	...props
} ) {
	const { href, onClick } = useLink( params, shouldReplace );

	return (
		<a href={ href } onClick={ onClick } { ...props }>
			{ children }
		</a>
	);
}
