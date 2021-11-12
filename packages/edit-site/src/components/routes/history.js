/**
 * External dependencies
 */
import { createBrowserHistory } from 'history';

/**
 * WordPress dependencies
 */
import { addQueryArgs } from '@wordpress/url';

export const history = createBrowserHistory();

export function push( params ) {
	history.push( addQueryArgs( '', params ) );
}

export function replace( params ) {
	history.replace( addQueryArgs( '', params ) );
}

export function back() {
	history.back();
}
